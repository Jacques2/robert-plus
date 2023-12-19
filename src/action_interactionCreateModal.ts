import {
    ButtonInteraction,
    Client,
    Interaction, MessageActionRow,
    MessageEmbed, Modal, TextInputComponent
} from "discord.js"
import {escapeFormatting, getDiscordDisplayName, verifyUsernameInput} from "./utility"
import * as DiscordJS from "discord.js"
import {
    APPLICATION_CHANNEL_ID, APPLICATION_NOTIFICATION_CHANNEL_ID,
    con, DEBUGMODE, IS_APPLICATION_ENABLED, IS_MAP_APPLICATION_ENABLED, IS_SHOP_APPLICATION_ENABLED,
    NO_EMOJI, RULE_PHRASE_EMOJI,
    RULE_PHRASE_TEXT,
    SERVER_NAME,
    YES_EMOJI
} from "./index"

// @ts-ignore
import { v4 as uuidv4 } from 'uuid'
import {
    lookupApplicationByUniqueIdentifier
} from "./zTopic_application_creator"
import {InProgressApplication, rebuildShopMessage} from "./zTopic_application_management"

export async function interactionCreateModal(client: Client, i: Interaction) {
    // modal submit is only currently used for shop application edits
    if (!i.isModalSubmit()) return
    console.log(`Received modal submit ${i.customId}`)
    const customId = i.customId
    const splitCustomId = customId.split(",")
    if (splitCustomId[0] != "shop") return // right now there are no other modals

    let application: InProgressApplication | undefined
    if (splitCustomId[1] == "editbyuuid")  {
        application = lookupApplicationByUniqueIdentifier(splitCustomId[2])
        if (application == null) return
        let changes: string = ""

        const oldOwner = application.answers[0]
        const oldType = application.answers[1]
        const oldXCoord = application.answers[2]
        const oldZCoord = application.answers[3]

        const shopOwnerInput = i.fields.getTextInputValue(`shopOwner`)
        const shopTypeInput = i.fields.getTextInputValue(`shopType`)
        const shopXCoordInput = i.fields.getTextInputValue(`xCoord`)
        const shopZCoordInput = i.fields.getTextInputValue(`zCoord`)
        if (oldOwner != shopOwnerInput) {
            application.answers[0] = shopOwnerInput
            changes += `Shop owner changed from '${escapeFormatting(oldOwner)}' to '${escapeFormatting(shopOwnerInput)}'\n`
        }
        if (oldType != shopTypeInput) {
            application.answers[1] = shopTypeInput
            changes += `Shop type changed from '${oldType}' to '${shopTypeInput}'\n`
        }
        if (oldXCoord != shopXCoordInput) {
            application.answers[2] = shopXCoordInput
            changes += `X coordinate changed from '${oldXCoord}' to '${shopXCoordInput}'\n`
        }
        if (oldZCoord != shopZCoordInput) {
            application.answers[3] = shopZCoordInput
            changes += `Z coordinate changed from '${oldZCoord}' to '${shopZCoordInput}'\n`
        }
        await i.reply({ content: `Edited by ${escapeFormatting(i.user.username)}\n${changes}` })
    } else if (splitCustomId[1] == "editbyid") {
        console.log("editbyid")
        con.query(`SELECT * FROM shop where shopId = ?`, [splitCustomId[2]], function (err: any, result: any, fields: any) {
            if (err) {
                const errMsg = `${NO_EMOJI} SQL Error, Jess needs to look into this (jx0051)`
                console.error(errMsg, err)
                return
            }
            if (result.length > 0) {
                const {
                    shopId,
                    shopOwner,
                    shopType,
                    xCoord,
                    zCoord,
                } = result[0]

                let changes: string = ""

                const newShopOwnerInput = i.fields.getTextInputValue(`shopOwner`)
                const newShopTypeInput = i.fields.getTextInputValue(`shopType`)
                const newShopXCoordInput = i.fields.getTextInputValue(`xCoord`)
                const newShopZCoordInput = i.fields.getTextInputValue(`zCoord`)
                console.log(`result: ${shopOwner}`)
                if (shopOwner != newShopOwnerInput) {
                    changes += `Shop owner changed from '${escapeFormatting(shopOwner)}' to '${escapeFormatting(newShopOwnerInput)}'\n`
                }
                if (shopType != newShopTypeInput) {
                    changes += `Shop type changed from '${shopType}' to '${newShopTypeInput}'\n`
                }
                if (xCoord != newShopXCoordInput) {
                    changes += `X coordinate changed from '${xCoord}' to '${newShopXCoordInput}'\n`
                }
                if (zCoord != newShopZCoordInput) {
                    changes += `Z coordinate changed from '${zCoord}' to '${newShopZCoordInput}'\n`
                }

                con.query(
                    'UPDATE shop SET shopOwner = ?, shopType = ?, xCoord = ?, zCoord = ? WHERE shopId = ?',
                    [newShopOwnerInput, newShopTypeInput, newShopXCoordInput, newShopZCoordInput, splitCustomId[2]],
                    function (err: any, result: any, fields: any) {
                        if (err) throw err
                        console.log('Update successful')
                    }
                )
                rebuildShopMessage()

                i.reply({ content: `${shopType} - ${shopOwner}: Edited by ${escapeFormatting(i.user.username)}\n${changes}` })
            } else {
                console.log('No rows found.')
            }
        })
    }
}


export function createShopEditModal(editByType: string, id: string, shopOwner: string, shopType: string, xCoord: string, zCoord: string): Modal {
    // Create the modal
    const modal = new Modal()
        .setCustomId(`shop,editby${editByType},${id}`)
        .setTitle(`Edit application: ${shopOwner}`)
    // Add components to modal
    // Create the text input components
    const shopOwnerInput = new TextInputComponent()
        .setCustomId('shopOwner')
        .setLabel("List of shop owner IGNs")
        .setValue(shopOwner)
        .setStyle('SHORT')
    const shopTypeInput = new TextInputComponent()
        .setCustomId('shopType')
        .setLabel("Shop Type")
        .setValue(shopType)
        .setStyle('SHORT')
    const xCoordInput = new TextInputComponent()
        .setCustomId('xCoord')
        .setLabel("X coordinate")
        .setValue(xCoord)
        .setStyle('SHORT')
    const zCoordInput = new TextInputComponent()
        .setCustomId('zCoord')
        .setLabel("Z coordinate")
        .setValue(zCoord)
        .setStyle('SHORT')
    // An action row only holds one text input,
    // so you need one action row per text input.
    // @ts-ignore
    const actionRow1 = new MessageActionRow().addComponents(shopOwnerInput)
    // @ts-ignore
    const actionRow2 = new MessageActionRow().addComponents(shopTypeInput)
    // @ts-ignore
    const actionRow3 = new MessageActionRow().addComponents(xCoordInput)
    // @ts-ignore
    const actionRow4 = new MessageActionRow().addComponents(zCoordInput)
    // @ts-ignore
    modal.addComponents(actionRow1, actionRow2, actionRow3, actionRow4)

    return modal
}